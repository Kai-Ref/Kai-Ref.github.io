---
title: "The Probabilistic Time Series Forecasting Trap: How Modern Models Score Well While Seeing the Future Wrong"
description: "Making state-of-the-art LTSF models probabilistic is almost trivially easy. Understanding why the results can still be fundamentally broken—and what that reveals about the architecture of uncertainty—is not."
pubDate: "2025-07-16"
tags:
  - "Probabilistic TSF"
  - "LTSF"
  - "Research"
readTime: "8 min read"
heroImage: "/img/posts/turning-ltsf-probabilistic-what-breaks/5_3.jpg"
sourceFormat: "md"
draft: false
---

Most modern long-term time series forecasting models are engineered to win. They dominate benchmarks, minimize error metrics, and scale with graceful efficiency across diverse datasets. Models like PatchTST, DLinear, and iTransformer ([Nie et al. 2022](#ref-nie_time_2022); [Zeng et al. 2023](#ref-zeng_are_2023); [Liu et al. 2023](#ref-liu_itransformer_2023)) have become the de facto standards in the field—and for good reason. On point forecasting, they are genuinely excellent.

But they all share one fundamental architectural assumption, one that tends to go unexamined precisely because it works so well for the task it was designed for: they predict the entire future horizon in a single forward pass. This approach—called **direct multi-step (DMS) forecasting**—is efficient, stable, and surprisingly accurate. The question I set out to explore in my master’s thesis was simpler to state than to answer: what actually happens when we try to make these models probabilistic?

The short version is that the transition is easy to implement, the evaluation metrics look good, and the actual forecasts can be deeply wrong in ways the metrics won’t tell you about.

## Turning Point Forecasters Probabilistic Is Almost Trivial

The first surprise was how little modification is needed. To go from a point-forecasting backbone to a probabilistic one, you essentially swap the output head:

- Replace scalar outputs with **distributional outputs** (e.g., parameterizing a Gaussian or Student-t), training against negative log-likelihood instead of MSE.
- Or predict **quantiles directly** via quantile regression, optimizing the pinball loss at each desired level.
- Or use an **implicit quantile network (IQN)** ([Dabney et al. 2018](#ref-dabney_implicit_2018); [Gouttes et al. 2021](#ref-gouttes_probabilistic_2021)), which learns a continuous mapping from sampled quantile levels to their corresponding values, bypassing the need to fix quantile levels in advance.

<figure id="fig-1">

<img src="/img/posts/turning-ltsf-probabilistic-what-breaks/prob_heads.jpg" alt="Probabilistic Modeling Heads" />
<figcaption>

<strong>Figure 1.</strong> Probabilistic Modeling Heads.
</figcaption>

</figure>

The backbone—the attention layers, the patch embeddings, the linear projections—remains untouched. This minimal-surgery approach is appealing: you preserve the well-tuned behavior of models that were carefully optimized for LTSF, and just reinterpret their output as distributional rather than point estimates. I applied this to three representative architectures (PatchTST, DLinear, and DeepAR) across all four head types, and integrated everything into the open-source BasicTS+ benchmark ([Shao et al. 2025](#ref-shao_exploring_2025)) to ensure reproducibility.

The first evaluation pass looked encouraging. Standard probabilistic metrics—CRPS, quantile loss, coverage—were all in reasonable ranges. Some configurations even showed strong performance. It seemed like a success.

Then I looked at the actual trajectories.

## The Zigzag Problem

When you sample from a probabilistic DMS model, you’re asking it to generate plausible futures. This is, after all, the point: not just a single prediction, but a distribution over what might happen. And this is where the architecture’s hidden assumption turns destructive.

DMS models are trained to predict each future time step independently ([Taieb and Hyndman 2012](#ref-taieb_recursive_2012)). Given an input context, the model produces a joint output over the full horizon, but with no explicit modeling of how step $`t+2`$ should relate to step $`t+1`$ given that both are uncertain. For point forecasts this is fine—you’re predicting means, and means aggregate cleanly. But when you sample:

``` math
\hat{x}_{t+1} \sim p(x_{t+1}), \quad \hat{x}_{t+2} \sim p(x_{t+2}), \quad \ldots, \quad \hat{x}_{t+H} \sim p(x_{t+H})
```

each draw is independent . Step t+1 might come from one region of the predictive distribution, while step t+2 comes from an entirely different one. The resulting trajectory doesn’t belong to any coherent possible future—it’s a random walk through independently-sampled marginals ([Kline 2004](#ref-kline_methods_2004); [Bontempi, Ben Taieb, and Le Borgne 2013](#ref-bontempi_machine_2013)).

The visual consequence is striking: the sample paths produced by univariate DMS models zigzag erratically in a way no real process would. They oscillate between the upper and lower tails of the distribution with every step, because there’s nothing stopping them from doing so. Oftentimes, the median forecast may look reasonable, but the sample trajectories—the thing you actually care about for simulation, risk assessment, or scenario planning—are essentially noise.

Attempting to fix this by modeling low-rank multivariate Gaussian outputs ([Wu, Qin, and Zhu 2020](#ref-wu_high-dimensional_2020); [Horn and Johnson 2012](#ref-horn_chapter_2012)) (so that adjacent time steps share some dependence through the covariance structure) may help at the margins, but not nearly enough. In our examples below, the multivariate model showed only minor improvement in sample quality.

## Multi-World Scenarios Expose the Real Problem

To make the failure mode precise rather than merely visual, I introduced the concept of **multi-world scenarios**. The idea is straightforward: consider a time series with a well-defined historical context—an observed prefix—from which multiple qualitatively different futures are plausible. The system might stay in a low-activity state, or it might transition to a high-activity one. The two futures are not just noisy variants of each other; they’re genuinely different modes of behavior.

A sound probabilistic forecast in such a setting should produce sample paths that each commit coherently to one future or the other—not paths that oscillate between them. If I sample 100 trajectories, roughly half should follow the low-activity scenario and half the high-activity one. What I should not get is trajectories that alternate between the two at every step.

<figure id="fig-2">

<img src="/img/posts/turning-ltsf-probabilistic-what-breaks/5_3.jpg" alt="Synthetic experiment setup" />
<figcaption>

<strong>Figure 2.</strong> Synthetic experiment trajectories.
</figcaption>

</figure>

To test this concretely ([Figure 2](#fig-2)), I constructed a synthetic multi-world example: all trajectories share a common 50-step prefix, after which the system branches into two possible futures (each being a sinusoidal with different phase, perturbed by Gaussian noise). This setup has a clear ground-truth multi-modal distribution, making it possible to rigorously quantify whether a model is actually capturing the structure or just averaging it away.

<figure id="fig-3">

<img src="/img/posts/turning-ltsf-probabilistic-what-breaks/5_4.jpg" alt="Synthetic experiment sample trajectories" />
<figcaption>

<strong>Figure 3.</strong> Predicted experiment sample trajectories.
</figcaption>

</figure>

The results were clarifying. The IMS model (DeepAR in autoregressive mode ([Salinas et al. 2020](#ref-salinas_deepar_2020))) produced sample paths that visually aligned with the true branching structure—too smooth to perfectly match the noisy ground truth, but clearly committed to individual modes. The univariate DMS model, by contrast, produced the expected zigzag artifacts: samples that switched between modes at every time step, achieving the correct marginal distributions but failing entirely to model the joint structure. The multivariate DMS variants were somewhere in between, with better sample behavior than the univariate version but substantially worse than IMS.

## When Metrics Lie

| Metric | Univariate DMS | Multivariate DMS (full rank) | Multivariate DMS (low rank) | IMS |
|----|----|----|----|----|
| KL divergence (KDE) | 1275.6065 | 210.6685 | *187.7011* | **101.4629** |
| KL divergence (kNN) | 60.1763 | 21.3201 | *11.7709* | **-8.2508** |
| CRPS | **0.3933** | 0.6129 | 0.4756 | *0.3943* |
| VS_0.5 (×10²) | 3.0365 | 4.7093 | *2.3564* | **1.411** |
| VS_1 (×10²) | *7.0590* | 30.0169 | 10.76 | **2.2303** |
| VS_2 (×10³) | *2.473* | 91.9942 | 20.9243 | **0.4558** |
| ES | *3.6286* | 5.0963 | 3.9637 | **3.2639** |
| wQS | **0.4054** | 0.7712 | 0.5546 | *0.4198* |
| WIS | **0.252** | 0.4786 | 0.3441 | *0.2615* |

The quantitative results in the Table above reveal something uncomfortable: standard univariate metrics completely miss this. CRPS, weighted quantile score, and weighted interval score—all of these evaluate the predictive distribution *marginally at each time step*. The univariate DMS model performed best on CRPS (0.393) and WIS (0.252). On these metrics alone, you would conclude it was the best model.

But when you switch to metrics that evaluate the *joint distribution* over time—variogram scores at multiple orders, energy scores, and KL divergence estimated via KDE and kNN—the picture reverses entirely. The IMS model consistently ranked first on multivariate metrics. The univariate DMS model’s KL divergence (KDE-estimated) was over twelve times larger than the IMS model’s. The model that looked best on standard metrics was generating trajectories that bore the least resemblance to plausible futures.

This isn’t a minor caveat. It’s a fundamental mismatch between what the field optimizes for and what probabilistic forecasting is actually supposed to provide. A model can achieve excellent CRPS by learning accurate marginal distributions at each step, while producing sample trajectories that no one would mistake for realistic futures. If your application involves scenario analysis, Monte Carlo simulation, or any downstream use of sampled paths, you cannot use per-step univariate metrics as a proxy for forecast quality.

<!-- ## The Full Trade-Off Picture
&#10;The real-world results on ETTh1 and ETTm1 (horizons of 720 steps, using three backbone models across four probabilistic head types—eleven configurations in total) reinforced and complicated this picture simultaneously.
&#10;DMS models dominated on standard and quantile-based metrics. On ETTh1, the quantile DLinear achieved the best CRPS, wQS, WIS, MSE, and MAE. On ETTm1, the pattern held: quantile DLinear first, IQN PatchTST second, with IMS (DeepAR) consistently below the DMS approaches on every aggregated metric. This is the expected outcome—error accumulation in autoregressive decoding compounds over 720 steps in ways that are hard to overcome, and DMS models don't suffer from this at all.
&#10;But inspect the samples (Figures C.6–C.10), and the story reverses on quality. DeepAR's autoregressive samples avoid the zigzag pathology essentially by construction—each step is conditioned on the previous one, so the trajectory is coherent by design. The DMS samples, regardless of backbone, showed the characteristic independence artifacts whenever the distributional head was univariate. The IQN head helped somewhat, producing more structured trajectories, likely because the shared quantile embedding implicitly introduces some consistency across time steps.
&#10;One finding that cuts against the complexity intuition: **quantile methods consistently outperformed distributional ones**, regardless of backbone. This held across both datasets, most metrics, and all three backbones. The reasons are layered. Quantile methods make weaker assumptions—they don't presuppose a parametric form for the output distribution—and this flexibility pays off when real data departs from Gaussian or Student-t shapes. They're also directly aligned with the evaluation: if you train on pinball loss at the same quantile levels used for CRPS computation, you're optimizing almost exactly what you're measuring. Perhaps most tellingly, quantile loss at the 0.5 quantile is mathematically equivalent to MAE—and LTSF models were originally optimized for MAE or MSE. Quantile-based probabilistic training is, in this sense, the most natural extension of the original training objective. It asks the model to do more of what it already does well, rather than pivoting to an entirely different loss landscape.
&#10;Multivariate heads—despite being the most principled attempt to model temporal dependencies within the DMS framework—actually degraded performance across the board. The additional parameters didn't pay off. For multivariate PatchTST in particular, neither the metric performance nor the sample quality improved. The capacity was being used, just not in ways that helped. -->

## What This Means in Practice

The tension my thesis documents isn’t new—the DMS vs. IMS tradeoff has been studied theoretically and empirically for years—but its probabilistic dimension has been largely overlooked. The field moved to DMS for good reasons: better accuracy, more stable training, no error accumulation. These advantages are real and they persist in the probabilistic setting. DMS models will generally score better on the metrics you see in papers.

What those metrics don’t tell you is whether the uncertainty is *meaningful*. If you deploy a probabilistic DMS model to generate 100 sample scenarios for a planning problem, you’ll get 100 trajectories that each have the right marginal distribution at every step—but that are individually implausible as paths through time. The ensemble might have the right “cloud” shape, but no individual sample reflects a world that could actually happen.

IMS models produce samples where this isn’t a problem by construction. The conditioning structure ensures that each trajectory is internally coherent: if step $`t+1`$ is high, step $`t+2`$ knows that and conditions on it. The cost is performance—error accumulation over long horizons is a real penalty—but the samples mean something.

The right choice depends on what you need from your probabilistic forecast. If you need marginal distributions at specific horizons for decision support, DMS with a quantile head will serve you well. If you need samples that represent coherent possible futures—for simulation, for risk assessment, for anything that treats the trajectory as a whole—you need to be much more careful. Standard metrics will not warn you when you’re in trouble.

## Where This Leaves Open Questions

Several directions from this work are worth pursuing. The multi-world scenario framework introduced here is currently validated primarily on synthetic data; extending it to a principled method for detecting multi-modal temporal structures in real-world datasets would make the failure mode more actionable. Gaussian Mixture Model-based clustering over historical prefixes is one candidate direction.

On the modeling side, hybrid DMS-IMS architectures are an obvious next step—there’s conceptual precedent in models like SMARTformer ([Li et al. 2023](#ref-li_smartformer_2023)), which generates sequences iteratively but refines the full output in a non-autoregressive pass. Combining the long-range accuracy of DMS with the trajectory coherence of IMS, ideally without paying the full cost of either failure mode, remains an open problem.

More expressive joint distribution modeling within DMS—copula models, normalizing flows, or attention-based multivariate heads that actually capture temporal structure—could also address the trajectory quality gap without abandoning the DMS decoding strategy entirely.

And perhaps most importantly: better evaluation frameworks. The variogram score and energy score can capture joint behavior, but they’re rarely reported in LTSF benchmarks. Building the infrastructure and norms for trajectory-level probabilistic evaluation would make the failure modes documented here more visible to the field, and create the right incentive structure for the next generation of models.

The core insight is simple enough to state plainly: a model that assigns the right probability to each individual future time step is not the same as a model that generates coherent views of possible futures. For many of the things people actually want from probabilistic forecasts, only the latter is sufficient—and the field is currently very good at building, evaluating, and celebrating the former.

<div id="refs" class="references csl-bib-body hanging-indent">

<div id="ref-bontempi_machine_2013" class="csl-entry">

Bontempi, Gianluca, Souhaib Ben Taieb, and Yann-Aël Le Borgne. 2013. “Machine Learning Strategies for Time Series Forecasting.” In *Business Intelligence: Second European Summer School, <span class="nocase">eBISS</span> 2012, Brussels, Belgium, July 15-21, 2012, Tutorial Lectures*, edited by Marie-Aude Aufaure and Esteban Zimányi, 62–77. Berlin, Heidelberg: Springer. <https://doi.org/10.1007/978-3-642-36318-4_3>.

</div>

<div id="ref-dabney_implicit_2018" class="csl-entry">

Dabney, Will, Georg Ostrovski, David Silver, and Remi Munos. 2018. “Implicit Quantile Networks for Distributional Reinforcement Learning.” *Proceedings of the 35th International Conference on Machine Learning*, July 2018, 1096–105. <https://proceedings.mlr.press/v80/dabney18a.html>.

</div>

<div id="ref-gouttes_probabilistic_2021" class="csl-entry">

Gouttes, Adèle, Kashif Rasul, Mateusz Koren, Johannes Stephan, and Tofigh Naghibi. 2021. “Probabilistic Time Series Forecasting with Implicit Quantile Networks.” *Proceedings of the Time Series Workshop at 38th International Conference on Machine Learning*, 2021.

</div>

<div id="ref-horn_chapter_2012" class="csl-entry">

Horn, Roger A., and Charles R. Johnson. 2012. “Chapter 7: Positive Definite and Semidefinite Matrices.” In *Matrix Analysis*, 2nd ed., 425–516. Cambridge University Press.

</div>

<div id="ref-kline_methods_2004" class="csl-entry">

Kline, Douglas M. 2004. “Methods for Multi-Step Time Series Forecasting Neural Networks.” In *Neural Networks in Business Forecasting*, 226–50. IGI Global Scientific Publishing. <https://doi.org/10.4018/978-1-59140-176-6.ch012>.

</div>

<div id="ref-li_smartformer_2023" class="csl-entry">

Li, Yiduo, Shiyi Qi, Zhe Li, Zhongwen Rao, Lujia Pan, and Zenglin Xu. 2023. “SMARTformer: Semi-Autoregressive Transformer with Efficient Integrated Window Attention for Long Time Series Forecasting.” *Proceedings of the Thirty-Second International Joint Conference on Artificial Intelligence* 3 (August 2023): 2169–77. <https://doi.org/10.24963/ijcai.2023/241>.

</div>

<div id="ref-liu_itransformer_2023" class="csl-entry">

Liu, Yong, Tengge Hu, Haoran Zhang, Haixu Wu, Shiyu Wang, Lintao Ma, and Mingsheng Long. 2023. “<span class="nocase">iTransformer</span>: Inverted Transformers Are Effective for Time Series Forecasting.” *Proceedings of the Twelfth International Conference on Learning Representations*, October 2023. <https://openreview.net/forum?id=JePfAI8fah>.

</div>

<div id="ref-nie_time_2022" class="csl-entry">

Nie, Yuqi, Nam H. Nguyen, Phanwadee Sinthong, and Jayant Kalagnanam. 2022. “A Time Series Is Worth 64 Words: Long-Term Forecasting with Transformers.” *Proceedings of the Eleventh International Conference on Learning Representations*, September 2022. <https://openreview.net/forum?id=Jbdc0vTOcol>.

</div>

<div id="ref-salinas_deepar_2020" class="csl-entry">

Salinas, David, Valentin Flunkert, Jan Gasthaus, and Tim Januschowski. 2020. “DeepAR: Probabilistic Forecasting with Autoregressive Recurrent Networks.” *International Journal of Forecasting* 36 (3): 1181–91. <https://doi.org/10.1016/j.ijforecast.2019.07.001>.

</div>

<div id="ref-shao_exploring_2025" class="csl-entry">

Shao, Zezhi, Fei Wang, Yongjun Xu, Wei Wei, Chengqing Yu, Zhao Zhang, Di Yao, et al. 2025. “Exploring Progress in Multivariate Time Series Forecasting: Comprehensive Benchmarking and Heterogeneity Analysis.” *IEEE Transactions on Knowledge and Data Engineering* 37 (1): 291–305. <https://doi.org/10.1109/TKDE.2024.3484454>.

</div>

<div id="ref-taieb_recursive_2012" class="csl-entry">

Taieb, Souhaib Ben, and Rob J. Hyndman. 2012. *Recursive and Direct Multi-Step Forecasting: The Best of Both Worlds*. 2012.

</div>

<div id="ref-wu_high-dimensional_2020" class="csl-entry">

Wu, Yilei, Yingli Qin, and Mu Zhu. 2020. “High-Dimensional Covariance Matrix Estimation Using a Low-Rank and Diagonal Decomposition.” *Canadian Journal of Statistics* 48 (2): 308–37. <https://doi.org/10.1002/cjs.11532>.

</div>

<div id="ref-zeng_are_2023" class="csl-entry">

Zeng, Ailing, Muxi Chen, Lei Zhang, and Qiang Xu. 2023. “Are Transformers Effective for Time Series Forecasting?” *Proceedings of the AAAI Conference on Artificial Intelligence* 37 (June 2023): 11121–28. <https://doi.org/10.1609/aaai.v37i9.26317>.

</div>

</div>
